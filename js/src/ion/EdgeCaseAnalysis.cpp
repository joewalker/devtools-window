/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4 -*-
 * vim: set ts=4 sw=4 et tw=99:
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include <stdio.h>

#include "Ion.h"
#include "IonBuilder.h"
#include "IonSpewer.h"
#include "EdgeCaseAnalysis.h"
#include "MIR.h"
#include "MIRGraph.h"

using namespace js;
using namespace js::ion;

EdgeCaseAnalysis::EdgeCaseAnalysis(MIRGenerator *mir, MIRGraph &graph)
  : mir(mir), graph(graph)
{
}

bool
EdgeCaseAnalysis::analyzeLate()
{
    for (ReversePostorderIterator block(graph.rpoBegin()); block != graph.rpoEnd(); block++) {
        if (mir->shouldCancel("Analyze Late (first loop)"))
            return false;
        for (MDefinitionIterator iter(*block); iter; iter++)
            iter->analyzeEdgeCasesForward();
    }

    for (PostorderIterator block(graph.poBegin()); block != graph.poEnd(); block++) {
        if (mir->shouldCancel("Analyze Late (second loop)"))
            return false;
        for (MInstructionReverseIterator riter(block->rbegin()); riter != block->rend(); riter++)
            riter->analyzeEdgeCasesBackward();
    }

    return true;
}

bool
EdgeCaseAnalysis::analyzeEarly()
{

    for (PostorderIterator block(graph.poBegin()); block != graph.poEnd(); block++) {
        if (mir->shouldCancel("Analyze Early (main loop)"))
            return false;
        for (MInstructionReverseIterator riter(block->rbegin()); riter != block->rend(); riter++)
            riter->analyzeTruncateBackward();
    }

    return true;
}

bool
EdgeCaseAnalysis::AllUsesTruncate(MInstruction *m)
{
    for (MUseIterator use = m->usesBegin(); use != m->usesEnd(); use++) {
        // See #809485 why this is allowed
        if (use->node()->isResumePoint())
            continue;

        MDefinition *def = use->node()->toDefinition();
        if (def->isTruncateToInt32())
            continue;
        if (def->isBitAnd())
            continue;
        if (def->isBitOr())
            continue;
        if (def->isBitXor())
            continue;
        if (def->isLsh())
            continue;
        if (def->isRsh())
            continue;
        if (def->isBitNot())
            continue;
        if (def->isAdd() && def->toAdd()->isTruncated())
            continue;
        if (def->isSub() && def->toSub()->isTruncated())
            continue;
        // cannot use divide, since |truncate(int32(x/y) + int32(a/b)) != truncate(x/y+a/b)|
        return false;
    }
    return true;
}
